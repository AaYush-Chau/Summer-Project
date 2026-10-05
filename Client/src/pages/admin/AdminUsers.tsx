
import { useEffect, useState } from "react";

import { Users } from "lucide-react";

import { getAdminUsers } from "../../api/admin.api";

interface User {
  _id: string;
  fullname: string;
  phone: string;
  role: string;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await getAdminUsers();

        if (response.status) {
          setUsers(response.data);
        }
      } catch (error) {
        console.error("Failed to load users:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F4EE] px-6 py-10">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8">
          <Users
            size={28}
            className="text-[#E3A73A]"
          />

          <h1 className="mt-2 text-3xl font-bold text-[#16233B]">
            Users
          </h1>

          <p className="mt-2 text-gray-600">
            Manage registered customers.
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
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user._id}
                      className="border-b last:border-b-0"
                    >
                      <td className="px-6 py-4 font-medium text-[#16233B]">
                        {user.fullname}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {user.phone}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {user.role}
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

export default AdminUsers;

