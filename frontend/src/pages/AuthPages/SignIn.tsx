import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Connexion | Elastic Solutions"
        description="Connectez-vous à votre espace Elastic Solutions."
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
