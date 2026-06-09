<script lang="ts">
  import SetPasswordForm from '$lib/components/set-password-form.svelte';

  let { form } = $props();
</script>

<SetPasswordForm {form} title="Set your password" cta="Set password" />
