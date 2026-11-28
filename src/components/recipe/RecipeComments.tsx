import { useRef, useState, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Spinner,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@postxl/ui-components'
import { foodly } from '../../api'
import { COMMENT_MAX, type RecipeComment } from '../../api/comments'
import { userImageSrc } from '../../api/assets'
import type { Recipe, RecipeId } from '../../api/protocol'
import { useCurrentUserId, useUser } from '../../catalog/CatalogProvider'
import { isOwner } from '../../editor/access'
import { useRequest } from '../../hooks/useRequest'
import { errorMessage } from '../../lib/errorMessage'
import { relativeTime } from '../../lib/relativeTime'
import { DemoHint } from '../DemoHint'

// Public comments at the end of the detail page: everyone who sees the recipe reads and writes; own comments can be
// deleted, the recipe owner may delete all.
export function RecipeComments({ recipe }: { recipe: Recipe }) {
  const me = useCurrentUserId()
  const loaded = useRequest(() => foodly.listComments(recipe.id), [recipe.id])
  // Local copy: the request's data isn't updated after a write.
  const [comments, setComments] = useState<RecipeComment[] | null>(null)
  const [deleting, setDeleting] = useState<RecipeComment | null>(null)

  if (loaded.status === 'loading') return null
  if (loaded.status === 'error') {
    return (
      <CommentsSection count={null}>
        <p role="alert" className="text-sm text-destructive">
          Kommentare konnten nicht geladen werden: {loaded.error?.message}
        </p>
      </CommentsSection>
    )
  }

  const list = comments ?? loaded.data ?? []
  const owner = isOwner(recipe, me)

  return (
    <CommentsSection count={list.length}>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Kommentare</p>
      ) : (
        <ol className="space-y-4">
          {list.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              isMine={comment.user === me}
              onDelete={comment.user === me || owner ? () => setDeleting(comment) : undefined}
            />
          ))}
        </ol>
      )}
      <CommentInput recipeId={recipe.id} onAdded={(c) => setComments([...list, c])} />
      <DeleteCommentDialog
        recipe={recipe}
        comment={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={(id) => {
          setComments(list.filter((c) => c.id !== id))
          setDeleting(null)
        }}
      />
    </CommentsSection>
  )
}

function CommentsSection({ count, children }: { count: number | null; children: ReactNode }) {
  return (
    <section className="mt-10" aria-labelledby="comments-title">
      {/* 19 px matches the section titles (SectionBlock), no token. */}
      <h2 id="comments-title" className="mb-3 font-display text-[19px] leading-tight text-foreground">
        {count === null ? 'Kommentare' : `Kommentare (${count})`}
      </h2>
      {children}
      <div className="mt-2">
        <DemoHint feature="comments" />
      </div>
    </section>
  )
}

function CommentRow({ comment, isMine, onDelete }: { comment: RecipeComment; isMine: boolean; onDelete?: () => void }) {
  const user = useUser(comment.user)
  const name = user?.name ?? `User ${comment.user}`
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <li className="flex items-start gap-3">
      <Avatar className="mt-0.5 h-7 w-7 shrink-0">
        {user?.profilePicture && <AvatarImage src={userImageSrc(user.profilePicture)} alt="" />}
        <AvatarFallback className="text-xs">{initial}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-medium text-foreground">
            {name}
            {isMine && <span className="font-normal text-muted-foreground"> (Du)</span>}
          </span>
          <time dateTime={comment.createdAt} className="text-xs text-muted-foreground">
            {relativeTime(comment.createdAt)}
          </time>
        </p>
        <p className="mt-0.5 text-base break-words whitespace-pre-wrap text-foreground">{comment.text}</p>
      </div>
      {onDelete && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="iconSm"
              aria-label="Kommentar löschen"
              onClick={onDelete}
              className="shrink-0 text-muted-foreground hover:text-foreground phone:size-10"
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Kommentar löschen</TooltipContent>
        </Tooltip>
      )}
    </li>
  )
}

function CommentInput({ recipeId, onAdded }: { recipeId: RecipeId; onAdded: (comment: RecipeComment) => void }) {
  const [text, setText] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)

  const send = async () => {
    if (inFlight.current || text.trim() === '') return
    inFlight.current = true
    setPending(true)
    setError(null)
    try {
      onAdded(await foodly.addComment(recipeId, text))
      setText('')
    } catch (e) {
      setError(errorMessage(e, 'Kommentar konnte nicht gesendet werden'))
    } finally {
      setPending(false)
      inFlight.current = false
    }
  }

  return (
    <div className="mt-5">
      <Textarea
        aria-label="Kommentar schreiben"
        placeholder="Kommentar schreiben …"
        rows={3}
        maxLength={COMMENT_MAX}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-2 flex items-center gap-3">
        {/* Outline: „Kochen“ stays the page's one primary action (#228). */}
        <Button variant="outline" size="sm" disabled={pending || text.trim() === ''} onClick={() => void send()}>
          Senden
        </Button>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {text.length} / {COMMENT_MAX}
        </span>
      </div>
    </div>
  )
}

function DeleteCommentDialog({
  recipe,
  comment,
  onClose,
  onDeleted,
}: {
  recipe: Recipe
  comment: RecipeComment | null
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // State lags a fast double click; the ref doesn't.
  const inFlight = useRef(false)

  const onOpenChange = (open: boolean) => {
    // Closing mid-request would leave the delete running behind a closed dialog.
    if (open || pending) return
    setError(null)
    onClose()
  }

  const onConfirm = async (target: RecipeComment) => {
    if (inFlight.current) return
    inFlight.current = true
    setPending(true)
    setError(null)
    try {
      await foodly.deleteComment(recipe.id, target.id, recipe.owner)
      onDeleted(target.id)
    } catch (e) {
      setError(errorMessage(e, 'Löschen fehlgeschlagen'))
    } finally {
      setPending(false)
      inFlight.current = false
    }
  }

  return (
    <AlertDialog open={comment !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Kommentar löschen?</AlertDialogTitle>
          <AlertDialogDescription>Der Kommentar wird für alle entfernt.</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Abbrechen</AlertDialogCancel>
          {/* Plain Button, aria-disabled: as in DeleteRecipeDialog (stays open on error, keeps focus while pending). */}
          <Button
            variant="destructive"
            onClick={() => comment && void onConfirm(comment)}
            aria-disabled={pending}
            className="gap-1.5 aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            {pending && <Spinner className="size-4" />}
            Löschen
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
