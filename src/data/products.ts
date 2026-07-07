import honeyBottle from "@/assets/honey-touch-bottle.png.asset.json";
import sweetBottle from "@/assets/sweet-dreams-bottle.png.asset.json";
import honeyBg from "@/assets/honey-touch-bg.jpg.asset.json";
import sweetBg from "@/assets/sweet-dreams-bg.jpg.asset.json";

export type Product = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  volume: string;
  price: number; // DA
  bottle: string;
  bg: string;
  tint: string;
};

export const PRODUCTS: Product[] = [
  {
    id: "sweet-dreams",
    name: "Sweet Dreams",
    tagline: "Floral · Fruits rouges · Musc",
    description:
      "Brume parfumée florale — pétales de rose, fruits rouges et une touche de musc pour une signature enveloppante.",
    volume: "Brume 200ml",
    price: 2500,
    bottle: sweetBottle.url,
    bg: sweetBg.url,
    tint: "#E88BB0",
  },
  {
    id: "honey-touch",
    name: "Honey Touch",
    tagline: "Vanille · Miel · Chaleur",
    description:
      "Un sillage chaud et gourmand — miel doré, vanille bourbon et bois précieux pour une aura solaire.",
    volume: "Brume 200ml",
    price: 2800,
    bottle: honeyBottle.url,
    bg: honeyBg.url,
    tint: "#D9A25A",
  },
];

export const formatDA = (n: number) =>
  new Intl.NumberFormat("fr-DZ").format(n) + " DA";

export const WILAYAS = [
  "01 - Adrar","02 - Chlef","03 - Laghouat","04 - Oum El Bouaghi","05 - Batna",
  "06 - Béjaïa","07 - Biskra","08 - Béchar","09 - Blida","10 - Bouira",
  "11 - Tamanrasset","12 - Tébessa","13 - Tlemcen","14 - Tiaret","15 - Tizi Ouzou",
  "16 - Alger","17 - Djelfa","18 - Jijel","19 - Sétif","20 - Saïda",
  "21 - Skikda","22 - Sidi Bel Abbès","23 - Annaba","24 - Guelma","25 - Constantine",
  "26 - Médéa","27 - Mostaganem","28 - M'Sila","29 - Mascara","30 - Ouargla",
  "31 - Oran","32 - El Bayadh","33 - Illizi","34 - Bordj Bou Arréridj","35 - Boumerdès",
  "36 - El Tarf","37 - Tindouf","38 - Tissemsilt","39 - El Oued","40 - Khenchela",
  "41 - Souk Ahras","42 - Tipaza","43 - Mila","44 - Aïn Defla","45 - Naâma",
  "46 - Aïn Témouchent","47 - Ghardaïa","48 - Relizane","49 - Timimoun","50 - Bordj Badji Mokhtar",
  "51 - Ouled Djellal","52 - Béni Abbès","53 - In Salah","54 - In Guezzam","55 - Touggourt",
  "56 - Djanet","57 - El M'Ghair","58 - El Meniaa",
];