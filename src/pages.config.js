import Home from './pages/Home';
import Admin from './pages/Admin';
import Branches from './pages/Branches';
import Console from './pages/Console';
import Display from './pages/Display';
import Kiosk from './pages/Kiosk';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Admin": Admin,
    "Branches": Branches,
    "Console": Console,
    "Display": Display,
    "Kiosk": Kiosk,
}

export const pagesConfig = {
    mainPage: "Kiosk",
    Pages: PAGES,
    Layout: __Layout,
};