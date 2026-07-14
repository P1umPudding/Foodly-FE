// The wire contract: the single definition of what's exchanged over the socket.
// Change only in lockstep with the backend. Frontend-only types (resolved/view
// models, UI state) belong in views.ts or beside their components, not here.

export type Hash = string

export type UserCategoryId = number
export type UserCategory = {
  id: UserCategoryId
  user: UserId
  name: string
  recipes: RecipeId[]
  order: number | null
  color: string
  colorLight: string | null
  colorDark: string | null
}

export type RecipeId = number
export type Recipe = {
  id: RecipeId

  owner: UserId // "my recipes" area im frontend (mit personal filter für alle rezepte die nicht geshared sind)
  editors: UserId[] // jeder viewer (und editor und owner) kann eine kopie des rezeptes erstellen wo er dann owner ist (viewers und editors sind dort erst leer)
  viewers: UserId[]

  name: string
  tags: TagId[]
  source: string | null
  rating: { user: UserId; rating: number }[]
  time: string | null
  workMinutes: number | null
  overallMinutes: number | null
  // Recipe size. sizeNumber non-null = an editable portion count the scaler
  // divides by (e.g. 3 Portionen); null = a fixed descriptor scaled by a plain
  // multiplier. sizeText is the TagText-formatted label.
  sizeNumber: number | null // 3                       null
  sizeText: string | null //   {Portionen}             28 cm {Springform}
  notes: string[]
  mainImage: ImageId | null // Hauptbild (Hero) für Liste-Thumbnail / Detail-Kopf; null = keins
  images: ImageId[] // weitere Bilder (Galerie), ohne das Hauptbild

  sections: Section[]
}

export type SectionId = number
export type Section = {
  id: SectionId
  name: string | null
  ingredients: RecipeIngredient[]
  steps: string[]
}

export type RecipeIngredientId = number
export type RecipeIngredient = {
  id: RecipeIngredientId
  ingredient: IngredientRef | null // expanded reference (id + name); null → reiner Freitext via `text`
  text: string | null // entweder hardcoded text wenn keine ingredient angegeben, oder suffix der hinter ingredient gerendert wird
  amount: string | null
  amountPrefix: string | null
  unit: string | null
}

export type IngredientId = number
export type Ingredient = {
  id: IngredientId
  name: string
  // ... weitere Metadaten (Icon, Standard-Einheit, Nährwerte) kommen hier später dazu.
}

// Expanded reference inlined in each recipe line: keeps the id (for shopping
// list / filtering) but carries the name, so rendering needs no catalog fetch.
export type IngredientRef = {
  id: IngredientId
  name: string
}

export type TagId = string
export type Tag = {
  id: TagId // gleichzeitig der name
  svg: Hash | null
}

// Backend/DB-only — NOT a wire type. This is how a rating is stored (one row
// per user+recipe). The frontend never fetches it directly; it only receives
// the embedded `recipe.rating`. Kept here (commented) so the backend team sees
// what needs to exist server-side.
// export type UserRating = {
//     recipe: RecipeId;
//     user: UserId;
//     rating: number;
// };

export type ImageId = number
export type Image = {
  id: ImageId
  hash: Hash
  name: string | null
}

export type UserId = number
export type User = {
  id: UserId
  name: string
  profilePicture: Hash | null
  // ...
}

export type GroupId = number
export type Group = {
  id: GroupId
  name: string
  owner: UserId
  members: UserId[]
}

// --- REST wire additions -------------------------------------------------

// List projection returned by GET /recipes and POST /recipes/search. Carries no
// sections/notes/images (see previewToRecipe, which fills them empty).
export type RecipePreview = Omit<Recipe, 'sections' | 'notes' | 'images'>

// Paginated envelope. `cursor` is the next page number as a string, or null.
export type PaginatedResponse<T> = { data: T[]; cursor: string | null }

export type RecipeAccessRight = 'owner' | 'editor' | 'viewer'
export type RecipeShareStateWire = 'private' | 'shared' | 'collaborative'
export type RecipeSortField = 'name' | 'worktime' | 'totaltime' | 'rating'
export type SortOrder = 'asc' | 'desc'

export type RecipeFilters = {
  categories?: number[]
  tags?: string[]
  ingredients?: number[]
  maxWorkTime?: number
  accessRights?: RecipeAccessRight[]
  shareStates?: RecipeShareStateWire[]
}
export type RecipeSort = { field: RecipeSortField; order: SortOrder }
export type RecipeSearchQuery = { filters?: RecipeFilters; sort?: RecipeSort }

// Frontend-normalized paginated recipe result (cursor parsed to a page number).
export type PaginatedRecipes = { items: Recipe[]; cursor: number | null }

// Write payload for POST /recipes and PUT /recipes/{id}. PUT is a FULL REPLACE:
// the backend deletes and re-inserts tags, images and sections, so nested ids are
// not stable across updates and any id sent in a nested object is ignored.
export type CreateRecipe = {
  name: string
  tags: TagId[]
  source: string | null
  time: string | null
  workMinutes: number | null
  overallMinutes: number | null
  sizeNumber: number | null
  sizeText: string | null
  notes: string[]
  mainImage: ImageId | null
  images: ImageId[]
  sections: CreateSection[]
}

// `ingredients` and `steps` have no serde default server-side — both keys must
// be present, even when empty.
export type CreateSection = {
  name: string | null
  ingredients: CreateRecipeIngredient[]
  steps: string[]
}

// `ingredient` is the bare id here, unlike the expanded IngredientRef on reads.
export type CreateRecipeIngredient = {
  ingredient: IngredientId | null
  text: string | null
  amount: string | null
  amountPrefix: string | null
  unit: string | null
}

export type UploadedImage = { id: ImageId; hash: Hash; name: string | null }
