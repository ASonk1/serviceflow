import { AuthForm } from "@/components/auth/auth-form"; import { updatePasswordAction } from "@/features/auth/actions";
export const metadata = { title: "Update password" }; export default function Page() { return <AuthForm kind="update" action={updatePasswordAction} />; }
