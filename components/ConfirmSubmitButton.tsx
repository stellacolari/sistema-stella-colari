"use client";

type ConfirmSubmitButtonProps = {
  label: string;
  confirmMessage: string;
  className?: string;
};

export default function ConfirmSubmitButton({
  label,
  confirmMessage,
  className = "",
}: ConfirmSubmitButtonProps) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        const confirmado = window.confirm(confirmMessage);
        if (!confirmado) {
          e.preventDefault();
        }
      }}
    >
      {label}
    </button>
  );
}