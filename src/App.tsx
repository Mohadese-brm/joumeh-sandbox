import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { SizeGuidePage } from './components/SizeGuide';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { Product } from './pages/Product';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Payment, Confirmation } from './pages/Payment';
import { NotFound } from './pages/NotFound';
import { Info } from './pages/Info';
import { Story } from './pages/Story';
import { AccountLayout, SupportLayout } from './pages/account/AccountLayout';
import { Overview, Orders, OrderDetail, Returns, ReturnDetail, Addresses, Favorites, PaymentInfo, Settings, SupportFaq, SupportContact } from './pages/account/Pages';
const ConfirmRoute = () => <Confirmation id={useParams().id!} />;
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="women" element={<Shop key="w" category="women" />} />
        <Route path="men" element={<Shop key="m" category="men" />} />
        <Route path="product/:slug" element={<Product />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="checkout/payment" element={<Payment />} />
        <Route path="checkout/confirmation/:id" element={<ConfirmRoute />} />
        <Route path="account" element={<AccountLayout />}>
          <Route index element={<Overview />} />
          <Route path="orders" element={<Orders />} /><Route path="orders/:id" element={<OrderDetail />} />
          <Route path="returns" element={<Returns />} /><Route path="returns/:id" element={<ReturnDetail />} />
          <Route path="addresses" element={<Addresses />} /><Route path="favorites" element={<Favorites />} />
          <Route path="payment" element={<PaymentInfo />} /><Route path="support" element={<SupportFaq />} /><Route path="support/contact" element={<SupportContact />} /><Route path="settings" element={<Settings />} />
        </Route>
        <Route path="support" element={<SupportLayout />}><Route index element={<SupportFaq />} /><Route path="contact" element={<SupportContact />} /></Route>
        <Route path="info/size-guide" element={<SizeGuidePage />} />
        <Route path="info/faq" element={<Navigate to="/support" replace />} /><Route path="info/contact" element={<Navigate to="/support/contact" replace />} />
        <Route path="info/story" element={<Story />} />
        <Route path="info/:slug" element={<Info />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
