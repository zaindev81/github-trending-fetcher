<script lang="ts">
  import { cn } from "$lib/utils";

  let { class: className = undefined, children, ...restProps } = $props();
</script>

<label
  class={cn(
    "text-sm font-medium leading-none text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</label>
