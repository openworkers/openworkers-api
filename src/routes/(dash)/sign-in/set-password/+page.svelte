<script lang="ts">
  import SetPasswordForm from '#lib/components/set-password-form.svelte';
  import { setPassword } from '../../auth.remote.ts';
</script>

<SetPasswordForm form={setPassword} title="Set your password" cta="Set password" />
