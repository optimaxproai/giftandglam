import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {parseHouseholdCsv} from "./importCsv";
const header=readFileSync("public/household-import-template.csv","utf8").trim();
const csv=(rows:string[][])=>header+"\n"+rows.map(r=>r.map(v=>'"'+v.replaceAll('"','""')+'"').join(",")).join("\n");
describe("full private CSV intake",()=>{
 it("groups siblings and retains precise sizes, age ambiguity, interests, notes and multiple gift cards",()=>{const families=parseHouseholdCsv(csv([["Fictional Parent","parent@example.invalid","555-0100","Story, with comma","Fictional Girl","12","Yes","Female","Youth L","12/14","4 or 5","Art kit; Puzzle, 24 pieces","Coat","Art; Music; Reading; Dance","Purple","Target","25","Ulta | 15; Walmart | 20","Additional private note","Sample source"],["Fictional Parent","parent@example.invalid","555-0100","","Fictional Boy","21","No","Male","Adult L","32","9","LEGO","Socks","Sports","","","","","",""]]));expect(families).toHaveLength(1);expect(families[0].children).toHaveLength(2);expect(families[0].story).toBe("Story, with comma");expect(families[0].source).toBe("Sample source");expect(families[0].children[0]).toMatchObject({age:12,ageUnsure:true,gender:"Girl",shoes:"4 or 5",wants:["Art kit","Puzzle, 24 pieces"],giftCards:[{store:"Target",amount:25},{store:"Ulta",amount:15},{store:"Walmart",amount:20}]});expect(families[0].children[0].notes).toContain("Dance");expect(families[0].children[1].age).toBe(21);});
 it("does not invent a gift card amount or age",()=>{const [family]=parseHouseholdCsv("Parent name,Child name,Gift card store,Gift card amount\nFictional Parent,Fictional Child,Target,");expect(family.children[0].age).toBeNull();expect(family.children[0].giftCards).toEqual([{store:"Target",amount:0}]);expect(family.children[0].notes).toContain("confirm amounts");});
 it("groups by phone when email is blank and keeps rows without contact details separate", () => {
   const input = "Parent name,Child name,Parent phone\nExample Parent,Child A,(404) 555-0100\nExample Parent,Child B,+1 404-555-0100\nExample Parent,Child C,\nExample Parent,Child D,";
   expect(parseHouseholdCsv(input).map((family) => family.children.length)).toEqual([2, 1, 1]);
 });
 it("flags different guardian names that reuse a contact even when an old ID column is blank", () => {
   const input = "Household ID,Parent name,Child name,Parent email\n,Guardian A,Child A,shared@example.invalid\n,Guardian B,Child B,shared@example.invalid";
   expect(() => parseHouseholdCsv(input)).toThrow(/CSV line 3.*separate family contact details/);
 });
 it("rejects conflicting household contacts and malformed amounts",()=>{expect(()=>parseHouseholdCsv("Household ID,Parent name,Child name,Parent email\na,Fictional A,Child A,a@example.invalid\na,Fictional B,Child B,b@example.invalid")).toThrow(/different parent details/);expect(()=>parseHouseholdCsv("Parent name,Child name,Gift card store,Gift card amount\nFictional Parent,Child,Target,2")).toThrow(/whole-dollar/);});
});
