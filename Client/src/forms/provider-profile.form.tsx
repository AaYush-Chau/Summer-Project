
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

import { createProviderProfile } from "../api/provider.api";

export const ProviderProfileForm = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [service, setService] = useState("plumber");
  const [experience, setExperience] = useState("");
  const [price, setPrice] = useState("");
  const [profileImage, setProfileImage] =
    useState<File | null>(null);

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: createProviderProfile,

    onSuccess: () => {
      navigate("/professional/dashboard");
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const formData = new FormData();

    formData.append("email", email);
    formData.append("dob", dob);
    formData.append("service", service);
    formData.append("experience", experience);
    formData.append("price", price);

    if (profileImage) {
      formData.append("profileImage", profileImage);
    }

    mutate(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <div>
        <h1 className="text-2xl font-bold text-[#16233B]">
          Complete Professional Profile
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Add your professional information so customers
          can find your services.
        </p>
      </div>

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">
            {(error as any)?.response?.data?.message ||
              "Unable to create your professional profile."}
          </p>
        </div>
      )}

      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-[#16233B] mb-2"
        >
          Email
        </label>

        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          placeholder="Enter your email"
          required
          className="w-full h-11 px-4 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:border-[#16233B] focus:ring-2 focus:ring-[#16233B]/10"
        />
      </div>

      {/* Date of Birth */}
      <div>
        <label
          htmlFor="dob"
          className="block text-sm font-medium text-[#16233B] mb-2"
        >
          Date of Birth
        </label>

        <input
          id="dob"
          type="date"
          value={dob}
          onChange={(event) =>
            setDob(event.target.value)
          }
          required
          className="w-full h-11 px-4 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:border-[#16233B] focus:ring-2 focus:ring-[#16233B]/10"
        />
      </div>

      {/* Service */}
      <div>
        <label
          htmlFor="service"
          className="block text-sm font-medium text-[#16233B] mb-2"
        >
          Service
        </label>

        <select
          id="service"
          value={service}
          onChange={(event) =>
            setService(event.target.value)
          }
          className="w-full h-11 px-4 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:border-[#16233B] focus:ring-2 focus:ring-[#16233B]/10"
        >
          <option value="plumber">Plumber</option>
          <option value="electrician">Electrician</option>
          <option value="cleaner">Cleaner</option>
          <option value="painter">Painter</option>
        </select>
      </div>

      {/* Experience */}
      <div>
        <label
          htmlFor="experience"
          className="block text-sm font-medium text-[#16233B] mb-2"
        >
          Experience (Years)
        </label>

        <input
          id="experience"
          type="number"
          min="0"
          value={experience}
          onChange={(event) =>
            setExperience(event.target.value)
          }
          placeholder="e.g. 5"
          required
          className="w-full h-11 px-4 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:border-[#16233B] focus:ring-2 focus:ring-[#16233B]/10"
        />
      </div>

      {/* Price */}
      <div>
        <label
          htmlFor="price"
          className="block text-sm font-medium text-[#16233B] mb-2"
        >
          Starting Price (NPR)
        </label>

        <input
          id="price"
          type="number"
          min="0"
          value={price}
          onChange={(event) =>
            setPrice(event.target.value)
          }
          placeholder="e.g. 1000"
          required
          className="w-full h-11 px-4 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:border-[#16233B] focus:ring-2 focus:ring-[#16233B]/10"
        />
      </div>

      {/* Profile Image */}
      <div>
        <label
          htmlFor="profileImage"
          className="block text-sm font-medium text-[#16233B] mb-2"
        >
          Profile Image
        </label>

        <input
          id="profileImage"
          type="file"
          accept="image/*"
          onChange={(event) =>
            setProfileImage(
              event.target.files?.[0] || null
            )
          }
          className="w-full text-sm text-gray-500"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full h-11 rounded-xl bg-[#16233B] text-white font-semibold text-sm hover:bg-[#F26B5E] transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending
          ? "Saving Profile..."
          : "Create Professional Profile"}
      </button>
    </form>
  );
};

