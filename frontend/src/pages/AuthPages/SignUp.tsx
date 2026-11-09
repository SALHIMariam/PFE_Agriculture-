import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Inscription | Elastic Solutions"
        description="Créez votre compte Elastic Solutions."
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
