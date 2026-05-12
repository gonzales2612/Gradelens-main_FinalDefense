export const formatColumnId = (id: string) =>
  id
    .split("_")
    .map((word) =>
      word.toLowerCase() === "id"
        ? "ID"
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ")
