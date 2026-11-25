import { normEmail, normPhone } from "./families";
import type { DraftFamily } from "./parseSchema";

const columns = {
  householdId: ["household id", "family id"],
  parentName: ["parent name", "parent full name", "guardian name", "parent guardian name", "parent or guardian name"],
  phone: ["phone", "parent phone", "phone number", "parent phone number"],
  email: ["email", "parent email", "email address", "parent email address"],
  story: ["story", "family story", "hardship"],
  fullName: ["child name", "child full name", "full name"],
  age: ["age", "child age"],
  ageUnsure: ["age unclear", "age unsure", "age uncertain"],
  gender: ["gender", "child gender"],
  tops: ["shirt size", "top size", "tops"],
  coatSize: ["coat size", "jacket size"],
  bottoms: ["pants size", "bottom size", "bottoms"],
  shoes: ["shoe size", "shoes"],
  wants: ["wants", "wishes", "wish list"],
  needs: ["needs", "essentials"],
  faves: ["favorites", "interests", "hobbies"],
  favColor: ["favorite color"],
  giftStore: ["gift card store"],
  giftAmount: ["gift card amount"],
  additionalGifts: ["additional gift cards"],
  notes: ["additional notes", "organizer notes", "notes"],
  source: ["source label", "source"],
};

type Column = keyof typeof columns;
type CsvRow = { line: number; cells: string[] };

function readRows(raw: string): CsvRow[] {
  const input = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const rows: CsvRow[] = [];
  let line = 1;
  let start = 1;
  let cells: string[] = [];
  let value = "";
  let state: "unquoted" | "quoted" | "closed" = "unquoted";

  function endCell() {
    cells.push(value.trim());
    value = "";
    state = "unquoted";
  }

  function endRow() {
    endCell();
    if (cells.some(Boolean)) rows.push({ line: start, cells });
    cells = [];
  }

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (state === "quoted") {
      if (char === '"' && input[i + 1] === '"') {
        value += '"';
        i++;
      } else if (char === '"') {
        state = "closed";
      } else {
        value += char;
        if (char === "\n") line++;
      }
    } else if (char === ",") {
      endCell();
    } else if (char === "\n") {
      endRow();
      start = ++line;
    } else if (state === "closed") {
      if (char !== " " && char !== "\t") throw new Error(`CSV line ${line}: expected a comma after the closing quote.`);
    } else if (char === '"') {
      if (value.trim()) throw new Error(`CSV line ${line}: put quotes around the whole cell.`);
      value = "";
      state = "quoted";
    } else {
      value += char;
    }
  }

  if (state === "quoted") throw new Error(`CSV row starting on line ${start} has an unclosed quote.`);
  endRow();
  return rows;
}

const normalizeHeader = (header: string) => header.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const splitItems = (value: string) => value.split(/[;\n]+/).map((item) => item.trim()).filter(Boolean);

export function parseHouseholdCsv(input: string): DraftFamily[] {
  const [header, ...rows] = readRows(input);
  if (!header || !rows.length) throw new Error("The CSV needs a header and at least one child row.");

  const labels = header.cells.map(normalizeHeader);
  const positions = new Map<Column, number>();
  for (const [field, names] of Object.entries(columns) as [Column, string[]][]) {
    const matches = labels.flatMap((label, index) => names.includes(label) ? [index] : []);
    if (matches.length > 1) throw new Error(`The CSV has more than one “${names[0]}” column.`);
    if (matches.length === 1) positions.set(field, matches[0]);
  }
  if (!positions.has("parentName") || !positions.has("fullName")) {
    throw new Error("The CSV must include Parent name and Child name columns. Download the template for an example.");
  }

  const families = new Map<string, DraftFamily>();
  for (const { line, cells } of rows) {
    const get = (key: Column) => cells[positions.get(key) ?? -1] ?? "";
    const parentName = get("parentName");
    const fullName = get("fullName");
    const email = get("email");
    const phone = get("phone");
    const story = get("story");
    if (cells.length > labels.length) throw new Error(`CSV line ${line} has extra columns. Put quotes around any cell containing a comma.`);
    if (!parentName || !fullName) throw new Error(`CSV line ${line} needs both a parent or guardian name and a child name.`);

    const ageText = get("age");
    const age = ageText ? Number(ageText) : null;
    if (age !== null && (!/^\d+$/.test(ageText) || age > 120)) {
      throw new Error(`CSV line ${line}: enter age as a whole number or leave it blank for review.`);
    }

    const genderText = get("gender").toLowerCase();
    const gender = ["girl", "female", "f"].includes(genderText) ? "Girl"
      : ["boy", "male", "m"].includes(genderText) ? "Boy" : genderText ? "Other" : null;
    const wants = splitItems(get("wants"));
    const needs = splitItems(get("needs"));
    const giftCards: {store:string;amount:number}[]=[];
    function addCard(store:string,raw:string) {
      const amountText=raw.trim().replace(/^\$/,"");
      const amount=amountText?Number(amountText):0; // zero stays blank in the editor; organizer must enter a proposed amount before saving.
      if(!store.trim()&&amountText)throw new Error(`CSV line ${line}: gift card store is missing.`);
      if(store.trim()&&amountText&&(!Number.isInteger(amount)||amount<5||amount>200))throw new Error(`CSV line ${line}: enter a whole-dollar gift card amount from $5 to $200.`);
      if(store.trim())giftCards.push({store:store.trim(),amount});
    }
    addCard(get("giftStore"),get("giftAmount"));
    for(const card of splitItems(get("additionalGifts"))){const [store,amount="",...extra]=card.split("|");if(extra.length)throw new Error(`CSV line ${line}: use Store | Amount for each additional card.`);addCard(store,amount);}
    if(giftCards.length>40)throw new Error(`CSV line ${line}: maximum 40 gift cards.`);
    const unsureText=get("ageUnsure").toLowerCase();
    if(unsureText&&!['yes','no','true','false','1','0'].includes(unsureText))throw new Error(`CSV line ${line}: Age unclear must be Yes or No.`);
    const faves=get("faves").split(/[,;\n]+/).map(v=>v.trim()).filter(Boolean);
    const notes=[get("notes"),faves.length>3?`Additional interests from application: ${faves.slice(3).join("; ")}`:"",giftCards.some(g=>!g.amount)?"One or more gift card amounts were not supplied; confirm amounts before saving.":""].filter(Boolean).join("\n");

    const householdId = get("householdId");
    const emailKey = normEmail(email);
    const phoneKey = normPhone(phone);
    // Older spreadsheets can still supply an explicit grouping key.
    const key = householdId ? `id:${householdId}` : emailKey ? `email:${emailKey}` : phoneKey ? `phone:${phoneKey}` : `row:${line}`;
    const family = families.get(key) ?? { parentName, email, phone, story, source:get("source"), children: [] };
    if (
      family.parentName.toLowerCase() !== parentName.toLowerCase()
      || (family.email && emailKey && normEmail(family.email) !== emailKey)
      || (family.phone && phoneKey && normPhone(family.phone) !== phoneKey)
    ) {
      throw new Error(`CSV line ${line} has different parent details for the same household. Use the same parent or guardian name and contact details for siblings. Use separate family contact details for different households.`);
    }
    if (family.children.length >= 12) throw new Error(`CSV line ${line} adds a thirteenth child to one household. The organizer can save up to 12 at a time.`);
    family.email ||= email;
    family.phone ||= phone;
    family.story ||= story;
    family.children.push({
      fullName, age, gender, tops: get("tops"), coatSize: get("coatSize"), bottoms: get("bottoms"), shoes: get("shoes"),
      wants, needs, faves: faves.slice(0,3), ageUnsure: ["yes","true","1"].includes(unsureText), notes,
      favColor: get("favColor"), giftStore: giftCards[0]?.store||"", giftAmount: giftCards[0]?.amount||25, giftCards, photo: null,
    });
    families.set(key, family);
  }
  return [...families.values()];
}
