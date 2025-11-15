<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { HTMLSelectAttributes } from "svelte/elements";
  import { cn } from "$lib/utils";

  type SelectProps = HTMLSelectAttributes & { class?: string; children?: () => unknown };

  let {
    class: className = undefined,
    children,
    value = undefined,
    ...restProps
  }: SelectProps = $props();

  const dispatch = createEventDispatcher<{ change: Event }>();
  function handleChange(event: Event) {
    dispatch("change", event);
  }
</script>

<select
  class={cn(
    "flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    className
  )}
  {value}
  onchange={handleChange}
  {...restProps}
>
  {@render children?.()}
</select>
