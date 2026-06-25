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
  amount: string | null // 3 {Portionen}            28 cm {Springform}
  basePortionMultiplier: number | null // 3                        1
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
