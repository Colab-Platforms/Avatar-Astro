import Joi from "joi";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const slugField = Joi.string().trim().lowercase().pattern(SLUG_PATTERN).max(150).messages({
  "string.empty": "Slug is required",
  "any.required": "Slug is required",
  "string.pattern.base": "Slug may only contain lowercase letters, numbers and single hyphens",
});

const statusField = Joi.string().valid("DRAFT", "PUBLISHED");
const displayOrderField = Joi.number().integer().min(0);

const bookFields = {
  title: Joi.string().trim().max(200).messages({
    "string.empty": "Title is required",
    "any.required": "Title is required",
  }),
  slug: slugField,
  author: Joi.string().trim().max(150).allow("", null),
  category: Joi.string().trim().max(100).messages({
    "string.empty": "Category is required",
    "any.required": "Category is required",
  }),
  description: Joi.string().trim().max(5000).messages({
    "string.empty": "Description is required",
    "any.required": "Description is required",
  }),
  status: statusField,
  displayOrder: displayOrderField,
};

const createBookSchema = Joi.object({
  title: bookFields.title.required(),
  slug: bookFields.slug.required(),
  author: bookFields.author.optional(),
  category: bookFields.category.required(),
  description: bookFields.description.required(),
  status: bookFields.status.optional(),
  displayOrder: bookFields.displayOrder.optional(),
});

const updateBookSchema = Joi.object({
  title: bookFields.title.optional(),
  slug: bookFields.slug.optional(),
  author: bookFields.author.optional(),
  category: bookFields.category.optional(),
  description: bookFields.description.optional(),
  status: bookFields.status.optional(),
  displayOrder: bookFields.displayOrder.optional(),
})
  .min(1)
  .messages({ "object.min": "Provide at least one field to update" });

const mantraFields = {
  title: Joi.string().trim().max(200).messages({
    "string.empty": "Title is required",
    "any.required": "Title is required",
  }),
  slug: slugField,
  deity: Joi.string().trim().max(150).allow("", null),
  category: Joi.string().trim().max(100).messages({
    "string.empty": "Category is required",
    "any.required": "Category is required",
  }),
  lyricsText: Joi.string().trim().max(10000).allow("", null),
  meaning: Joi.string().trim().max(10000).allow("", null),
  status: statusField,
  displayOrder: displayOrderField,
};

const createMantraSchema = Joi.object({
  title: mantraFields.title.required(),
  slug: mantraFields.slug.required(),
  deity: mantraFields.deity.optional(),
  category: mantraFields.category.required(),
  lyricsText: mantraFields.lyricsText.optional(),
  meaning: mantraFields.meaning.optional(),
  status: mantraFields.status.optional(),
  displayOrder: mantraFields.displayOrder.optional(),
});

const updateMantraSchema = Joi.object({
  title: mantraFields.title.optional(),
  slug: mantraFields.slug.optional(),
  deity: mantraFields.deity.optional(),
  category: mantraFields.category.optional(),
  lyricsText: mantraFields.lyricsText.optional(),
  meaning: mantraFields.meaning.optional(),
  status: mantraFields.status.optional(),
  displayOrder: mantraFields.displayOrder.optional(),
})
  .min(1)
  .messages({ "object.min": "Provide at least one field to update" });

const listSchema = Joi.object({
  search: Joi.string().trim().max(150).allow("").optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const validateCreateBookSchema = (data: unknown) => createBookSchema.validate(data, { abortEarly: false });
export const validateUpdateBookSchema = (data: unknown) => updateBookSchema.validate(data, { abortEarly: false });
export const validateCreateMantraSchema = (data: unknown) => createMantraSchema.validate(data, { abortEarly: false });
export const validateUpdateMantraSchema = (data: unknown) => updateMantraSchema.validate(data, { abortEarly: false });
export const validateListSchema = (data: unknown) => listSchema.validate(data, { abortEarly: false });
