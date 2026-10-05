
import Header from "../components/home/Header";
import Hero from "../components/home/hero";
import Categories from "../components/home/categories";
import Sections from "../components/home/sections";
import Footer from "../components/home/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F8F7F3]">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-16">
        <Hero />
        <Categories />
        <Sections />
      </main>

      <Footer />
    </div>
  );
}

