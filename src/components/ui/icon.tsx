import {
  Aperture,
  Apple,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BellOff,
  Bolt,
  Camera,
  Check,
  Circle,
  CircleUserRound,
  ChevronRight,
  Copy,
  Download,
  Ellipsis,
  Flame,
  Globe2,
  Home,
  Images,
  MailCheck,
  FileText,
  LifeBuoy,
  LockKeyhole,
  LogOut,
  Send,
  Share,
  SquarePlus,
  Settings,
  ShieldCheck,
  Smile,
  Sparkles,
  Star,
  SwitchCamera,
  Trash2,
  Trophy,
  UserPlus,
  UsersRound,
  WifiOff,
  Wine,
  X,
  type LucideIcon,
} from "lucide-react-native";
import Svg, { Path } from "react-native-svg";

function GoogleIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path
        fill="#4285F4"
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844c-.209 1.125-.843 2.078-1.797 2.716v2.258h2.909c1.702-1.567 2.684-3.874 2.684-6.614Z"
      />
      <Path
        fill="#34A853"
        d="M9 18c2.43 0 4.468-.806 5.956-2.18l-2.909-2.259c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.585-5.037-3.715H.956v2.332A9 9 0 0 0 9 18Z"
      />
      <Path
        fill="#FBBC05"
        d="M3.963 10.706A5.41 5.41 0 0 1 3.682 9c0-.592.101-1.17.281-1.706V4.962H.956A9 9 0 0 0 0 9c0 1.45.347 2.824.956 4.038l3.007-2.332Z"
      />
      <Path
        fill="#EA4335"
        d="M9 3.58c1.322 0 2.508.454 3.442 1.346l2.581-2.582C13.464.891 11.43 0 9 0A9 9 0 0 0 .956 4.962l3.007 2.332C4.672 5.164 6.656 3.58 9 3.58Z"
      />
    </Svg>
  );
}

const icons: Record<string, LucideIcon> = {
  "apple.logo": Apple,
  "arrow.right": ArrowRight,
  "bell.fill": Bell,
  "bell.slash.fill": BellOff,
  "bolt.fill": Bolt,
  "camera.aperture": Aperture,
  "camera.fill": Camera,
  checkmark: Check,
  "checkmark.shield.fill": ShieldCheck,
  "chevron.left": ArrowLeft,
  "chevron.right": ChevronRight,
  "circle.fill": Circle,
  "doc.on.doc.fill": Copy,
  download: Download,
  "envelope.badge.fill": MailCheck,
  "face.smiling.fill": Smile,
  "file.text": FileText,
  "flame.fill": Flame,
  globe: Globe2,
  "house.fill": Home,
  images: Images,
  "ellipsis": Ellipsis,
  "paperplane.fill": Send,
  "plus.app": SquarePlus,
  "square.and.arrow.up": Share,
  "lifebuoy": LifeBuoy,
  "lock.shield": LockKeyhole,
  "logout": LogOut,
  "person.3.fill": UsersRound,
  "person.crop.circle.badge.plus": UserPlus,
  "person.crop.circle.fill": CircleUserRound,
  "chart.bar.fill": BarChart3,
  sparkles: Sparkles,
  "star.fill": Star,
  settings: Settings,
  "switch.camera": SwitchCamera,
  "trash.fill": Trash2,
  trophy: Trophy,
  "wifi.slash": WifiOff,
  "wineglass.fill": Wine,
  x: X,
};

export function Icon({
  name,
  size = 20,
  color,
  strokeWidth = 2.2,
}: {
  name: string;
  size?: number;
  color: string;
  strokeWidth?: number;
}) {
  if (name === "google") {
    return <GoogleIcon size={size} />;
  }

  const Component = icons[name] ?? Circle;
  return <Component size={size} color={color} strokeWidth={strokeWidth} />;
}
