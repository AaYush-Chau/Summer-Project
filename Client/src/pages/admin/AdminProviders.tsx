
import { useEffect, useState } from "react";

import { UserCheck } from "lucide-react";

import { getAdminProviders } from "../../api/admin.api";

interface Provider {
  _id: string;
  fullname: string;
  phone: string;
  role: string;
}

const AdminProviders = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const response = await getAdminProviders();

        if (response.status) {
          setProviders(response.data);
        }
      } catch (error) {
        console.error(
          "Failed to load providers:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadProviders();
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F4EE] px-6 py-10">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8">
          <UserCheck
            size={28}
            className="text-[#E3A73A]"
          />

          <h1 className="mt-2 text-3xl font-bold text-[#16233B]">
            Service Providers
          </h1>

          <p className="mt-2 text-gray-600">
            Manage registered service providers.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">

              <thead className="bg-[#16233B] text-white">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Role</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Loading providers...
                    </td>
                  </tr>
                ) : providers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No providers found.
                    </td>
                  </tr>
                ) : (
                  providers.map((provider) => (
                    <tr
                      key={provider._id}
                      className="border-b last:border-b-0"
                    >
                      <td className="px-6 py-4 font-medium text-[#16233B]">
                        {provider.fullname}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {provider.phone}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {provider.role}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

            </table>
          </div>
        </div>

      </div>
    </main>
  );
};

export default AdminProviders;

