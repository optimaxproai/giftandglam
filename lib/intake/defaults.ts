import type { Question } from "./types";

/** Stable ids so seeds, tests and the organizer editor can refer to the starting questions. */
export const Q = {
  parentName: "q_parent_name",
  phone: "q_phone",
  email: "q_email",
  hardship: "q_hardship",
  childName: "q_child_name",
  age: "q_age",
  wishes: "q_wishes",
  needs: "q_needs",
  sizes: "q_sizes",
  interests: "q_interests",
} as const;

/** The starting 2027 questionnaire. Organizers can reword, reorder, add, delete and change which are required. */
export function defaultQuestions(): Question[] {
  return [
    { id: Q.parentName, scope: "household", key: "parent_name", prompt: "Parent or guardian full name", type: "text", required: true },
    { id: Q.phone, scope: "household", key: "phone", prompt: "Phone number", type: "text", required: true },
    { id: Q.email, scope: "household", key: "email", prompt: "Email address", type: "text", required: true },
    { id: Q.hardship, scope: "household", key: "hardship", prompt: "What has made this year hard for your family?", help: "Only the organizers read this. It is never shown to sponsors.", type: "longtext", required: true },
    { id: Q.childName, scope: "child", key: "child_name", prompt: "Child's full name", type: "text", required: true },
    { id: Q.age, scope: "child", key: "age", prompt: "Child's age", type: "number", required: true },
    { id: Q.wishes, scope: "child", key: "wishes", prompt: "Wishes: things your child would love (one per line)", type: "list", required: true },
    { id: Q.needs, scope: "child", key: "needs", prompt: "Needs: clothes and basics (one per line)", type: "list", required: true },
    { id: Q.sizes, scope: "child", key: "sizes", prompt: "Shirt, pants and shoe sizes", type: "text", required: true },
    { id: Q.interests, scope: "child", key: "interests", prompt: "Interests or favorite things (up to 3, one per line)", type: "list", required: false },
  ];
}

export const KEY_LABEL: Record<string, string> = {
  parent_name: "Parent name",
  phone: "Phone",
  email: "Email",
  hardship: "Private hardship answer",
  child_name: "Child name",
  age: "Age (becomes the public age range)",
  wishes: "Public wishes",
  needs: "Public needs",
  sizes: "Public sizes",
  interests: "Public interests",
};
