// ─────────────────────────────────────────────────────────────────────────
// WIRE PROTOCOL — the contract between frontend and backend.
//
// This file is the SINGLE definition of what is exchanged over the socket
// (the JSON the backend sends/receives). Treat it as the API contract: change
// it only when the backend protocol changes, in lockstep with the backend.
//
// Frontend-only types — resolved/view models, derived shapes, UI state — do
// NOT belong here. Resolved view models produced at the API boundary live in
// `src/api/views.ts`; component-specific types stay co-located with their
// components. Keeping this file pure makes the wire contract auditable at a
// glance.
// ─────────────────────────────────────────────────────────────────────────

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
    rating: { user: UserId; rating: number }[];
    time: string | null;
    workMinutes: number | null;
    overallMinutes: number | null;
    amount: string | null; // 3 {Portionen}            28 cm {Springform}
    basePortionMultiplier: number | null; // 3                        1
    notes: string[];
    images: ImageId[];

    sections: Section[];
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
    ingredient: IngredientRef | null; // expanded reference (id + name); null → reiner Freitext via `text`
    text: string | null; // entweder hardcoded text wenn keine ingredient angegeben, oder suffix der hinter ingredient gerendert wird
    amount: string | null;
    amountPrefix: string | null;
    unit: string | null;
};

export type IngredientId = number;
export type Ingredient = {
    id: IngredientId;
    name: string;
    // ... weitere Metadaten (Icon, Standard-Einheit, Nährwerte) kommen hier später dazu.
};

// Schlanke, denormalisierte Projektion einer Zutat, wie sie inline in jeder
// Rezeptzeile mitkommt (expanded reference): id bleibt erhalten (für
// Einkaufsliste / Filtern nach Zutat), der Name kommt zum sofortigen Rendern
// mit — ohne den vollen Zutaten-Katalog laden zu müssen.
export type IngredientRef = {
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
