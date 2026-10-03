import { HashRouter, Route, Routes } from "react-router-dom";
import Profile from "./pages/Profile";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import Home from "./pages/Home";
import Search from "./pages/Search";
import AnimeDetails from "./pages/AnimeDetails";
import Watch from "./pages/Watch";
import Genre from "./pages/Genre";
import MyList from "./pages/MyList";
import Airing from "./pages/Airing";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 antialiased selection:bg-red-600/40">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/search" element={<Search />} />
            <Route path="/anime/:malId" element={<AnimeDetails />} />
            <Route path="/watch/:malId" element={<Watch />} />
            <Route path="/genre/:name" element={<Genre />} />
            <Route path="/my-list" element={<MyList />} />
            <Route path="/airing" element={<Airing />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </HashRouter>
  );
}