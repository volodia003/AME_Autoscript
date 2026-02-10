import { Icons } from "../../types/icons";

interface Icon {
  name: Icons;
  className?: "";
  alt?: string;
  width?: number;
  height?: number;
}

export default function Icon({
  name,
  className = "",
  alt = "icon",
  width,
  height,
}: Icon) {
  return (
    <img
      src={`icons/${name}.svg`}
      alt={alt}
      className={className}
      width={width || 24}
      height={height || 24}
      aria-hidden="true"
    />
  );
}
