import { TbHomeFilled } from "react-icons/tb";
import { MdOutlineQrCode2 } from "react-icons/md";
import { SiGooglecloudstorage } from "react-icons/si";
import { BiSolidCategory } from "react-icons/bi";
import { MdCategory } from "react-icons/md";
import { FaChartBar } from "react-icons/fa";
import { TbDeviceDesktopAnalytics } from "react-icons/tb";

export const sidebarMenu = [
  { name: "Dashboard", href: "/dashboard", icon: <TbHomeFilled className="text-xl" /> },
  { name: "Generate QR", href: "/addQR", icon: <MdOutlineQrCode2 className="text-xl" /> },
  { name: "QR Data", href: "/qrData", icon: <SiGooglecloudstorage className="text-xl" /> },
  { name: "Location Category", href: "/addCategoryPage", icon: <BiSolidCategory className="text-xl" /> },
  { name: "QR Category", href: "/qrType", icon: <MdCategory className="text-xl" /> },
  // { name: "Live Data", href: "/liveData", icon: <FaChartBar className="text-xl" /> },
  { name: "HeatMaps", href: "/heatmaps", icon: <TbDeviceDesktopAnalytics className="text-xl" /> },
];
