<script lang="ts">
  import SetPasswordForm from '#lib/components/set-password-form.svelte';
  import { resetPassword } from '../../auth.remote.ts';
</script>

<SetPasswordForm form={resetPassword} title="Choose a new password" cta="Reset password" />
