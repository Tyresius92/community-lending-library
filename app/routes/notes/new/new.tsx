import { useEffect, useRef } from "react";
import type { ActionFunctionArgs } from "react-router";
import { data, redirect, Form, useActionData } from "react-router";

import { createNote } from "~/models/note.server";
import { requireUserId } from "~/session.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);

  const formData = await request.formData();
  const title = formData.get("title");
  const body = formData.get("body");

  if (typeof title !== "string" || title.length === 0) {
    return data(
      { errors: { body: null, title: "Title is required" } },
      { status: 400 },
    );
  }

  if (typeof body !== "string" || body.length === 0) {
    return data(
      { errors: { body: "Body is required", title: null } },
      { status: 400 },
    );
  }

  const note = await createNote({ body, title, userId });

  return redirect(`/notes/${note.id}`);
};

export default function NewNotePage() {
  const actionData = useActionData<typeof action>();
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (actionData?.errors?.title) {
      titleRef.current?.focus();
    } else if (actionData?.errors?.body) {
      bodyRef.current?.focus();
    }
  }, [actionData]);

  return (
    <Form method="post">
      <div>
        <label>
          <span>Title: </span>
          <input
            ref={titleRef}
            name="title"
            aria-invalid={actionData?.errors?.title ? true : undefined}
            aria-errormessage={
              actionData?.errors?.title ? "title-error" : undefined
            }
          />
        </label>
        {actionData?.errors?.title ? (
          <div id="title-error">{actionData.errors.title}</div>
        ) : null}
      </div>

      <div>
        <label>
          <span>Body: </span>
          <textarea
            ref={bodyRef}
            name="body"
            rows={8}
            aria-invalid={actionData?.errors?.body ? true : undefined}
            aria-errormessage={
              actionData?.errors?.body ? "body-error" : undefined
            }
          />
        </label>
        {actionData?.errors?.body ? (
          <div id="body-error">{actionData.errors.body}</div>
        ) : null}
      </div>

      <div>
        <button type="submit">Save</button>
      </div>
    </Form>
  );
}
