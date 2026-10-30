import { Router } from "express";
import { uploadSingleImage } from "@/middleware/upload.js";
import * as shopController from "./shop.controller.js";

// Mounted under /api/admin/shop, which applies the main-admin guard (SUPERADMIN, re-checked in the database).
const router = Router();

// Categories
router.get("/categories", shopController.listCategories);
router.get("/categories/all", shopController.listAllActiveCategories);
router.post("/categories", shopController.createCategory);
router.get("/categories/:id", shopController.getCategory);
router.patch("/categories/:id", shopController.updateCategory);
router.delete("/categories/:id", shopController.deleteCategory);
router.post(
  "/categories/:id/image",
  uploadSingleImage,
  shopController.setCategoryImage,
);

// Products
router.get("/products", shopController.listProducts);
router.post("/products", shopController.createProduct);
router.get("/products/:id", shopController.getProduct);
router.patch("/products/:id", shopController.updateProduct);
router.delete("/products/:id", shopController.deleteProduct);
router.post(
  "/products/:id/image",
  uploadSingleImage,
  shopController.setProductImage,
);

export default router;
