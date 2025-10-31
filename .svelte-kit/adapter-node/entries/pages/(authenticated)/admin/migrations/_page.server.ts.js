const load = async ({ fetch }) => {
  const res = await fetch("/(authenticated)/admin/migrations");
  if (!res.ok) {
    return { migrations: [] };
  }
  const body = await res.json();
  return { migrations: body.migrations || [] };
};
const prerender = false;
export {
  load,
  prerender
};
