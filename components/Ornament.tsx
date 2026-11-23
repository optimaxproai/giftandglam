/* eslint-disable @next/next/no-img-element */
/** A round ornament: the child's photo when one may be shown, otherwise a coloured bauble with their initial. */
export function Ornament({ id, name, photo, big = false }: { id: string; name: string; photo: boolean; big?: boolean }) {
  const g = `g${(name.charCodeAt(0) % 3) + 1}`;
  return (
    <div className={`ball ${g}${big ? " big" : ""}`} aria-hidden="true">
      {photo ? <img src={`/api/photo/${id}`} alt="" /> : name.charAt(0).toUpperCase()}
    </div>
  );
}
