// middlewares/error.middleware.ts
export function errorMiddleware(err: any, _: any, res: any, __: any) {
  console.error(err);
  res.status(500).json({ error: "internal_error" });
}
