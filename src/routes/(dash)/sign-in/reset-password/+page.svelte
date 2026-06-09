<script lang="ts">
  import SetPasswordForm from '$lib/components/set-password-form.svelte';
</script>

<SetPasswordForm endpoint="/api/v1/reset-password" title="Choose a new password" cta="Reset password" />
