// Agrupa las rutas de cada módulo bajo el prefijo común /api.
import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes.js";
import { cartRouter } from "../modules/cart/cart.routes.js";
import { catalogRouter } from "../modules/catalog/catalog.routes.js";
import { couponsRouter } from "../modules/coupons/coupons.routes.js";
import { inventoryRouter } from "../modules/inventory/inventory.routes.js";
import { auditRouter } from "../modules/bitacora/audit.routes.js";
import { usersRouter } from "../modules/users/users.routes.js";
import { configurationRouter } from "../modules/configuration/configuration.routes.js";
import { checkoutRouter } from "../modules/checkout/checkout.routes.js";
import { ordersRouter } from "../modules/orders/orders.routes.js";
import { reportsRouter } from "../modules/reports/reports.routes.js";
import { returnsRouter } from "../modules/returns/returns.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/cart", cartRouter);
apiRouter.use("/catalog", catalogRouter);
apiRouter.use("/coupons", couponsRouter);
apiRouter.use("/inventory", inventoryRouter);
apiRouter.use("/audit", auditRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/configuration", configurationRouter);
apiRouter.use("/orders", checkoutRouter);
apiRouter.use("/orders", returnsRouter);
apiRouter.use("/orders", ordersRouter);
apiRouter.use("/reports", reportsRouter);
