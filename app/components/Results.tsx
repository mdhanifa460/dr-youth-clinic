import Image from "next/image";

export default function Results({ city = "" }: { city?: string }) {
  return (
  <section id="results" className="py-32 px-8 bg-surface-soft">
<div className="max-w-7xl mx-auto">
<div className="text-center mb-20 space-y-4">
<h2 className="text-4xl md:text-5xl font-extrabold font-headline text-primary">Real Results</h2>
<p className="text-gray-700 text-lg max-w-2xl mx-auto font-semibold">Witness the transformation of our actual patients through professional dermatological intervention.</p>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-12">
<div className="bg-white p-6 rounded-[32px] shadow-lg hover:shadow-xl transition">
<div className="grid grid-cols-2 gap-4 mb-6">
<div className="relative">
<Image
  className="rounded-3xl w-full h-80 object-cover"
  alt="close-up of skin with active acne and redness before clinical dermatological treatment"
  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC2jPRtWrwOWtLCkjBLVz2-n3PYNW0itymTXe-PJzrb1WHNPq0TiO_LWXqEN-BTVP8nCwcYdNeZkWGOfKNlSP6ZQPJ8WsSmsBAyotiILxBxA1myNwQOfwmZ4KqqHwwcCAEZkDF7b8yOUKsnkL3wIxiRswVciZWY0lL2P27ZlSBy_3lTcv2pnf_DyZ_ZaJuvTmK9lg_JtE2PFYxAp6qOoF9eC_gx84hQhR04HXgLe39lBNUH1wSOLwEOjKtWBwgonycF6VEoW_X51t0"
  width={320}
  height={320}

  priority
/>
<span className="absolute top-4 left-4 bg-primary text-white text-xs px-3 py-1 rounded-full font-bold">BEFORE</span>
</div>
<div className="relative">
<Image
  className="rounded-3xl w-full h-80 object-cover"
  alt="close-up of clear smooth radiant skin after clinical dermatological treatment and therapy"
  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBxkMATWYGu2T8vnbrQFOR96gssNtKKmMT8a8FnXafLRy_MjDGiZXVYzTjTieACQdtU7r-PTayMku13IrlCMwq9iUbwTjsbn_g53t8fKWOS3_Gturj5WsIL0ziTZIbhxrx4NvYg3Yb1VXIx15Zd-Qz5giuCVdSkbiH4gSQlcBI_YkRu1O-1h--3kgY8jQF2BT1xWJWZn6nW51WPyCRgWFf7C6IaWXkgINbLVS2fuiyb8iA0r-32mISWb-l7DFUPMUFXFw6jvLnyF34"
  width={320}
  height={320}
  
  priority
/>
<span className="absolute top-4 left-4 bg-secondary text-white text-xs px-3 py-1 rounded-full font-bold">AFTER</span>
</div>
</div>
<div className="px-4">
<h4 className="text-xl font-bold font-headline text-primary mb-2"><a className="hover:text-secondary" href="{{DATA:SCREEN:SCREEN_73}}">Acne Therapy & Scar Revision</a></h4>
<p className="text-gray-600 font-medium">Treatment Period: 12 Weeks • Combined Laser & Chemical Peel Therapy</p>
</div>
</div>
<div className="bg-white p-6 rounded-[32px] shadow-lg hover:shadow-xl transition">
<div className="grid grid-cols-2 gap-4 mb-6">
<div className="relative">
<Image
  className="rounded-3xl w-full h-80 object-cover"
  alt="close-up view of hair thinning on scalp before clinical hair restoration therapy"
  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAPx0qDlXsxSuwUywctO-3U_UlgrOA0QqMpGpZ5dP4WDLObAhR1UNzM9AgMO9jRn_5ONQYmiNyekTNmcEathezvLO3FFXMRU88uV9BP50CBlZ0hnk_RbjfeMji_UxkbuynPuIAhL-psiuMaXgcGv2wOxZikB8-FNyv0NATg9T6UR8qFZZuzokr4rHEQsj898yqi9VTcvWfSnM_GkIFssH9igX6Du4oomI-LUoaEckv34vfkJsNfnklxYHxyUeSOmjO9DOpVWFFXRUg"
  width={320}
  height={320}
  
  priority
/>
<span className="absolute top-4 left-4 bg-primary text-white text-xs px-3 py-1 rounded-full font-bold">BEFORE</span>
</div>
<div className="relative">
<Image
  className="rounded-3xl w-full h-80 object-cover"
  alt="close-up view of thick dense hair growth on scalp after clinical restoration and PRP therapy"
  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDR756oZoeVugayyLMlLLg-sbPbaweP01juD3ZjOBNAYfvd7MDEmCJBDYxbdtkCeE7G-lhmQ-wj2_P7F3CGOBTUnrcxNdzCxUvkZUQChSj_BWjPpyd31kl_mhjdxk6fPxsAOz5VMeRHdSBVPlKFsTHnMD8fyG7C-LQOezl8UAmA1y3k-3qKirV0jx34LK4Ym0-59HRuqMVwJ3Vploayi34_5vmJEaHR6DPSi9yeh1Nr2dDDvt7AQpx0jaPiiT4GqVs5TNyPjeg7fhE"
  width={320}
  height={320}

  priority
/>
<span className="absolute top-4 left-4 bg-secondary text-white text-xs px-3 py-1 rounded-full font-bold">AFTER</span>
</div>
</div>
<div className="px-4">
<h4 className="text-xl font-bold font-headline text-primary mb-2">Non-Surgical Hair Restoration</h4>
<p className="text-gray-600 font-medium">Treatment Period: 6 Months • Advanced PRP & Stem Cell Therapy</p>
</div>
</div>
</div>
</div>
</section>
  );
}