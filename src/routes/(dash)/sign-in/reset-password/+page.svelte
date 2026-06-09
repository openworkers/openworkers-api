<script lang="ts">
  import SetPasswordForm from '$lib/components/set-password-form.svelte';

  let { form } = $props();
</script>

<SetPasswordForm {form} title="Choose a new password" cta="Reset password" />
