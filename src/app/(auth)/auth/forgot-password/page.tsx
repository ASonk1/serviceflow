import { AuthForm } from "@/components/auth/auth-form"; import { forgotPasswordAction } from "@/features/auth/actions";
export const metadata = { title: "Forgot password" }; export default function Page() { return <AuthForm kind="forgot" action={forgotPasswordAction} />; }
