import { NextResponse } from "next/server";

export function ok<T>(data: T, message = "OK", status = 200) {
  return NextResponse.json({ success: true, data, message }, { status });
}

export function fail(code: string, message: string, status = 400) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status },
  );
}

export const Errors = {
  unauthorized: () => fail("UNAUTHORIZED", "Please sign in to continue.", 401),
  forbidden: () => fail("FORBIDDEN", "You do not have permission to perform this action.", 403),
  notFound: (what = "Resource") => fail("NOT_FOUND", `${what} not found.`, 404),
  validation: (message: string) => fail("VALIDATION_ERROR", message, 422),
  server: (message = "Something went wrong. Please try again.") =>
    fail("SERVER_ERROR", message, 500),
};
