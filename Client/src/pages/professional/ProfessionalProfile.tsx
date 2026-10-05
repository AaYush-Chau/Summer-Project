
import { ProviderProfileForm } from "../../forms/provider-profile.form";

export const ProfessionalProfilePage = () => {
  return (
    <main className="min-h-screen bg-[#F7F4EE] flex items-center justify-center px-4 py-10">
      <div
        className="
          w-full
          max-w-lg
          bg-white
          rounded-2xl
          border
          border-gray-200
          shadow-[0_20px_50px_rgba(22,35,59,0.10)]
          px-8
          py-10
        "
      >
        <ProviderProfileForm />
      </div>
    </main>
  );
};

