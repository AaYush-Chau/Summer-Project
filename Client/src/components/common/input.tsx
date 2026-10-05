
import { useState } from "react";
import type { UseFormRegister } from "react-hook-form";

type IProps = {
  name: string;
  id: string;
  type?: "text" | "password" | "number" | "Date";
  placeholder: string;
  error?: string;
  label: string;
  register: UseFormRegister<any>;
};

export const Input: React.FC<IProps> = ({
  name,
  label,
  type,
  placeholder,
  error,
  id,
  register,
}) => {
  const [show, setShow] = useState(false);

  return (
    <div className="w-full flex flex-col justify-center items-center p-1">

      <div className="w-full flex flex-col items-center px-3">

        {/* Label */}
        <label
          htmlFor={id}
          className="text-gray-700 font-medium"
        >
          {label}
        </label>

        {/* Input */}
        <input
          {...register(name)}
          id={id}
          type={
            type === "password"
              ? show
                ? "text"
                : "password"
              : type
          }
          placeholder={placeholder}
          className="
            w-full
            text-gray-800
            border
            border-gray-300
            rounded-xl
            h-9
            px-5
            shadow
            shadow-cyan-950
            focus:outline-none
            focus:border-blue-500
          "
        />

        {/* Validation error */}
        {error && (
          <p className="text-red-500 text-xs">
            {error}
          </p>
        )}
      </div>

      {/* Show password */}
      <div className="w-full flex justify-end">
        {type === "password" && (
          <label className="flex items-center gap-1 p-1 cursor-pointer">
            <input
              onChange={(e) => setShow(e.target.checked)}
              type="checkbox"
            />

            <p className="text-xs text-gray-600">
              Show password
            </p>
          </label>
        )}
      </div>

    </div>
  );
};

