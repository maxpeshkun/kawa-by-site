// pages/wholesale/order.js
import React, { useEffect, useMemo, useState } from "react";
import { getJSON, setJSON } from "@/lib/safeStorage";

const STORAGE_KEY = "kawa.cart.v1";

function classNames(...a) { return a.filter(Boolean).join(" "); }

export default function WholesaleOrderPage() {
  // ---- auth guard ----
  const [user, setUser] = useState(undefined); // undefined = загрузка, null = не авторизован, {email} = ок
  useEffect(() => {
    let alive = true;
    (async () => {
     
