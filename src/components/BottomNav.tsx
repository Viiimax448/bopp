"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HiOutlineHome, HiHome } from "react-icons/hi";
import { FiSearch } from "react-icons/fi";
import { FaUser, FaRegUser } from "react-icons/fa";
import { HiOutlineFire, HiFire } from "react-icons/hi";

const navItems = [
  {
    href: "/inicio",
    label: "Inicio",
    icon: (active: boolean) => active ? <HiHome className="text-[#FB3C4C] scale-110" size={28} /> : <HiOutlineHome className="text-gray-400" size={26} />,
  },
  {
    href: "/tendencias",
    label: "Tendencias",
    icon: (active: boolean) => active ? <HiFire className="text-[#FB3C4C] scale-110" size={26} /> : <HiOutlineFire className="text-gray-400" size={25} />,
  },
  {
    href: "/buscar",
    label: "Buscar",
    icon: (active: boolean) => <FiSearch className={active ? "text-[#FB3C4C] scale-110" : "text-gray-400"} size={26} />,
  },
  {
    href: "/perfil",
    label: "Perfil",
    icon: (active: boolean) => active ? <FaUser className="text-[#FB3C4C] scale-110" size={25} /> : <FaRegUser className="text-gray-400" size={24} />,
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-gray-100 pb-6 pt-3 px-6 z-50">
      <div className="flex justify-between items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className="flex flex-col items-center flex-1"
              tabIndex={0}
            >
              {item.icon(active)}
              {/* Etiquetas ocultas para accesibilidad */}
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
