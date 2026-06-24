// Backend data model — the shape of the JSON the backend sends us over the
// socket. Keep these in sync with the real backend protocol; everything the
// `foodly.*` API surface (`./index.ts`) returns should be expressed in terms
// of these types.

export type Hash = string;

export type UserCategoryId = number;
export type UserCategory = {
  id: UserCategoryId;
  user: UserId;
  name: string;
  recipes: RecipeId[];
  order: number | null;
  color: string;
  colorLight: string | null;
  colorDark: string | null;
};

export type RecipeId = number;
export type Recipe = {
  id: RecipeId;

  owner: UserId; // "my recipes" area im frontend (mit personal filter für alle rezepte die nicht geshared sind)
  viewers: UserId[]; // jeder viewer (und editor und owner) kann eine kopie des rezeptes erstellen wo er dann owner ist (viewers und editors sind dort erst leer)
  editors: UserId[];

  name: string;
  tags: TagId[];
  source: string | null;

  time: string | null;
  workMinutes: number | null;
  overallMinutes: number | null;
  amount: string | null; // 3 {Portionen}            28 cm {Springform}
  basePortionMultiplier: number | null; // 3                        1
  notes: string[];
  images: ImageId[];

  sections: Section[];

  // So nicht in der DB gestored, aber von der API returned:
  rating: { user: UserId; rating: number }[];
};

export type SectionId = number;
export type Section = {
  id: SectionId;
  name: string | null;
  ingredients: RecipeIngredient[];
  steps: string[];
};

export type RecipeIngredientId = number;
export type RecipeIngredient = {
  id: RecipeIngredientId;
  ingredient: IngredientId | null;
  text: string | null; // entweder hardcoded text wenn keine ingredientId angegeben, oder suffix der hinter ingredient gerendert wird
  amount: string | null;
  amountPrefix: string | null;
  unit: string | null;
};

export type IngredientId = number;
export type Ingredient = {
  id: IngredientId;
  name: string;
};

export type TagId = string;
export type Tag = {
  id: TagId; // gleichzeitig der name
  svg: Hash | null;
};

export type UserRating = {
  recipe: RecipeId;
  user: UserId;
  rating: number;
};

export type ImageId = number;
export type Image = {
  id: ImageId;
  hash: Hash;
  name: string | null;
};

export type UserId = number;
export type User = {
  id: UserId;
  name: string;
  profilePicture: Hash | null;
  // ...
};

export type GroupId = number;
export type Group = {
  id: GroupId;
  name: string;
  members: UserId[];
};
