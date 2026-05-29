import { VNode } from "plgg-view";

/**
 * The add-todo input. The `<form>` carries `action="/api/todos"` and
 * `method="POST"` so the markup is semantically a real form submission; the
 * CSR listener (`client.tsx`) intercepts `submit`, sends a JSON body via
 * plgg-fetch, and re-renders on success.
 */
export const TodoForm = (): VNode => (
  <form
    class="todo-form"
    action="/api/todos"
    method="POST"
    data-action="create"
  >
    <label class="todo-form-label">
      <span>New To-Do</span>
      <input
        type="text"
        name="title"
        class="todo-form-title"
        placeholder="What needs doing?"
        required={true}
        maxlength={200}
        autocomplete="off"
      />
    </label>
    <button type="submit" class="todo-form-submit">
      add
    </button>
  </form>
);
