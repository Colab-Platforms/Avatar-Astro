import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import {
  deleteAudioByPublicId,
  deleteImageByPublicId,
  deletePublicDocument,
  getAttachmentUrl,
  uploadAudioBuffer,
  uploadImageBuffer,
  uploadPublicDocumentBuffer,
} from "@/config/cloudinary.js";
import type {
  CreateBookInput,
  CreateMantraInput,
  DevotionLibraryStats,
  ListParams,
  ListResult,
  MantraChantDTO,
  PublicMantraChantDTO,
  PublicSpiritualBookDTO,
  SpiritualBookDTO,
  UpdateBookInput,
  UpdateMantraInput,
  UploadFile,
} from "./devotionLibrary.types.js";

const BOOK_FOLDER = "devotion-library/books";
const MANTRA_AUDIO_FOLDER = "devotion-library/mantras";
const COVER_FOLDER = "devotion-library/covers";

class DevotionLibraryService {
  // ── Spiritual Books (admin) ─────────────────────────────────────────────

  async listBooks({ search, page, limit }: ListParams): Promise<ListResult<SpiritualBookDTO>> {
    const term = search?.trim();
    const where = term
      ? {
          OR: [
            { title: { contains: term, mode: "insensitive" as const } },
            { author: { contains: term, mode: "insensitive" as const } },
            { category: { contains: term, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      prisma.spiritualBook.findMany({
        where,
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.spiritualBook.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toBookDTO(row)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getBookById(id: string): Promise<SpiritualBookDTO> {
    const book = await prisma.spiritualBook.findUnique({ where: { id } });
    if (!book) throw new ApiError("Book not found", STATUS_CODES.NOT_FOUND);
    return this.toBookDTO(book);
  }

  async createBook(input: CreateBookInput): Promise<SpiritualBookDTO> {
    await this.assertBookSlugAvailable(input.slug);

    const book = await prisma.spiritualBook.create({
      data: {
        title: input.title,
        slug: input.slug,
        author: input.author || null,
        category: input.category,
        description: input.description,
        status: input.status ?? "DRAFT",
        displayOrder: input.displayOrder ?? 0,
      },
    });

    return this.toBookDTO(book);
  }

  async updateBook(id: string, input: UpdateBookInput): Promise<SpiritualBookDTO> {
    const existing = await prisma.spiritualBook.findUnique({ where: { id } });
    if (!existing) throw new ApiError("Book not found", STATUS_CODES.NOT_FOUND);

    if (input.slug && input.slug !== existing.slug) {
      await this.assertBookSlugAvailable(input.slug);
    }

    const book = await prisma.spiritualBook.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.slug !== undefined && { slug: input.slug }),
        ...(input.author !== undefined && { author: input.author || null }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.displayOrder !== undefined && { displayOrder: input.displayOrder }),
      },
    });

    return this.toBookDTO(book);
  }

  async deleteBook(id: string): Promise<void> {
    const existing = await prisma.spiritualBook.findUnique({ where: { id } });
    if (!existing) throw new ApiError("Book not found", STATUS_CODES.NOT_FOUND);

    if (existing.filePublicId) await deletePublicDocument(existing.filePublicId).catch(() => false);
    if (existing.coverImagePublicId) await deleteImageByPublicId(existing.coverImagePublicId).catch(() => false);

    await prisma.spiritualBook.delete({ where: { id } });
  }

  async setBookFile(id: string, file: UploadFile): Promise<SpiritualBookDTO> {
    const existing = await prisma.spiritualBook.findUnique({ where: { id } });
    if (!existing) throw new ApiError("Book not found", STATUS_CODES.NOT_FOUND);

    // The literal ".pdf" suffix is required: Cloudinary's "raw" resource type has no
    // separate format field, so without it the asset serves as application/octet-stream
    // with no file extension (see uploadPublicDocumentBuffer's doc comment).
    const publicId = `${BOOK_FOLDER}/${existing.slug}-${Date.now()}.pdf`;
    const uploaded = await uploadPublicDocumentBuffer(file.buffer, publicId);

    if (existing.filePublicId) await deletePublicDocument(existing.filePublicId).catch(() => false);

    const book = await prisma.spiritualBook.update({
      where: { id },
      data: { fileUrl: uploaded.url, filePublicId: uploaded.publicId, fileBytes: file.size },
    });

    return this.toBookDTO(book);
  }

  async setBookCover(id: string, file: UploadFile): Promise<SpiritualBookDTO> {
    const existing = await prisma.spiritualBook.findUnique({ where: { id } });
    if (!existing) throw new ApiError("Book not found", STATUS_CODES.NOT_FOUND);

    const uploaded = await uploadImageBuffer(file.buffer, `${COVER_FOLDER}/books`);

    if (existing.coverImagePublicId) await deleteImageByPublicId(existing.coverImagePublicId).catch(() => false);

    const book = await prisma.spiritualBook.update({
      where: { id },
      data: { coverImageUrl: uploaded.url, coverImagePublicId: uploaded.publicId },
    });

    return this.toBookDTO(book);
  }

  // ── Mantras & Chants (admin) ─────────────────────────────────────────────

  async listMantras({ search, page, limit }: ListParams): Promise<ListResult<MantraChantDTO>> {
    const term = search?.trim();
    const where = term
      ? {
          OR: [
            { title: { contains: term, mode: "insensitive" as const } },
            { deity: { contains: term, mode: "insensitive" as const } },
            { category: { contains: term, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      prisma.mantraChant.findMany({
        where,
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.mantraChant.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toMantraDTO(row)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getMantraById(id: string): Promise<MantraChantDTO> {
    const mantra = await prisma.mantraChant.findUnique({ where: { id } });
    if (!mantra) throw new ApiError("Mantra not found", STATUS_CODES.NOT_FOUND);
    return this.toMantraDTO(mantra);
  }

  async createMantra(input: CreateMantraInput): Promise<MantraChantDTO> {
    await this.assertMantraSlugAvailable(input.slug);

    const mantra = await prisma.mantraChant.create({
      data: {
        title: input.title,
        slug: input.slug,
        deity: input.deity || null,
        category: input.category,
        lyricsText: input.lyricsText || null,
        meaning: input.meaning || null,
        status: input.status ?? "DRAFT",
        displayOrder: input.displayOrder ?? 0,
      },
    });

    return this.toMantraDTO(mantra);
  }

  async updateMantra(id: string, input: UpdateMantraInput): Promise<MantraChantDTO> {
    const existing = await prisma.mantraChant.findUnique({ where: { id } });
    if (!existing) throw new ApiError("Mantra not found", STATUS_CODES.NOT_FOUND);

    if (input.slug && input.slug !== existing.slug) {
      await this.assertMantraSlugAvailable(input.slug);
    }

    const mantra = await prisma.mantraChant.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.slug !== undefined && { slug: input.slug }),
        ...(input.deity !== undefined && { deity: input.deity || null }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.lyricsText !== undefined && { lyricsText: input.lyricsText || null }),
        ...(input.meaning !== undefined && { meaning: input.meaning || null }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.displayOrder !== undefined && { displayOrder: input.displayOrder }),
      },
    });

    return this.toMantraDTO(mantra);
  }

  async deleteMantra(id: string): Promise<void> {
    const existing = await prisma.mantraChant.findUnique({ where: { id } });
    if (!existing) throw new ApiError("Mantra not found", STATUS_CODES.NOT_FOUND);

    if (existing.audioPublicId) await deleteAudioByPublicId(existing.audioPublicId).catch(() => false);
    if (existing.coverImagePublicId) await deleteImageByPublicId(existing.coverImagePublicId).catch(() => false);

    await prisma.mantraChant.delete({ where: { id } });
  }

  async setMantraAudio(id: string, file: UploadFile): Promise<MantraChantDTO> {
    const existing = await prisma.mantraChant.findUnique({ where: { id } });
    if (!existing) throw new ApiError("Mantra not found", STATUS_CODES.NOT_FOUND);

    // uploadAudioBuffer requires a unique public_id per call (overwrite is disabled), so a fresh
    // timestamp is appended on every (re-)upload rather than reusing the mantra's slug alone.
    const publicId = `${MANTRA_AUDIO_FOLDER}/${existing.slug}-${Date.now()}`;
    const uploaded = await uploadAudioBuffer(file.buffer, publicId);

    if (existing.audioPublicId) await deleteAudioByPublicId(existing.audioPublicId).catch(() => false);

    const mantra = await prisma.mantraChant.update({
      where: { id },
      data: {
        audioUrl: uploaded.url,
        audioPublicId: uploaded.publicId,
        durationSeconds: uploaded.durationSeconds ? Math.round(uploaded.durationSeconds) : null,
      },
    });

    return this.toMantraDTO(mantra);
  }

  async setMantraCover(id: string, file: UploadFile): Promise<MantraChantDTO> {
    const existing = await prisma.mantraChant.findUnique({ where: { id } });
    if (!existing) throw new ApiError("Mantra not found", STATUS_CODES.NOT_FOUND);

    const uploaded = await uploadImageBuffer(file.buffer, `${COVER_FOLDER}/mantras`);

    if (existing.coverImagePublicId) await deleteImageByPublicId(existing.coverImagePublicId).catch(() => false);

    const mantra = await prisma.mantraChant.update({
      where: { id },
      data: { coverImageUrl: uploaded.url, coverImagePublicId: uploaded.publicId },
    });

    return this.toMantraDTO(mantra);
  }

  // ── Stats (admin) ────────────────────────────────────────────────────────

  async getStats(): Promise<DevotionLibraryStats> {
    const [bookTotal, bookPublished, bookAgg, topBooks, mantraTotal, mantraPublished, mantraAgg, topMantras] =
      await Promise.all([
        prisma.spiritualBook.count(),
        prisma.spiritualBook.count({ where: { status: "PUBLISHED" } }),
        prisma.spiritualBook.aggregate({ _sum: { downloadCount: true } }),
        prisma.spiritualBook.findMany({
          orderBy: { downloadCount: "desc" },
          take: 5,
          select: { id: true, title: true, downloadCount: true },
        }),
        prisma.mantraChant.count(),
        prisma.mantraChant.count({ where: { status: "PUBLISHED" } }),
        prisma.mantraChant.aggregate({ _sum: { playCount: true, downloadCount: true } }),
        prisma.mantraChant.findMany({
          orderBy: { playCount: "desc" },
          take: 5,
          select: { id: true, title: true, playCount: true, downloadCount: true },
        }),
      ]);

    return {
      books: {
        total: bookTotal,
        published: bookPublished,
        totalDownloads: bookAgg._sum.downloadCount ?? 0,
        top: topBooks,
      },
      mantras: {
        total: mantraTotal,
        published: mantraPublished,
        totalPlays: mantraAgg._sum.playCount ?? 0,
        totalDownloads: mantraAgg._sum.downloadCount ?? 0,
        top: topMantras,
      },
    };
  }

  // ── Public (unauthenticated) ─────────────────────────────────────────────

  async listPublicBooks(): Promise<PublicSpiritualBookDTO[]> {
    const books = await prisma.spiritualBook.findMany({
      where: { status: "PUBLISHED", fileUrl: { not: null } },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    });

    return books.map((row) => this.toPublicBookDTO(row));
  }

  async getPublicBookBySlug(slug: string): Promise<PublicSpiritualBookDTO> {
    const book = await prisma.spiritualBook.findFirst({ where: { slug, status: "PUBLISHED" } });
    if (!book) throw new ApiError("Book not found", STATUS_CODES.NOT_FOUND);
    return this.toPublicBookDTO(book);
  }

  /**
   * Fire-and-forget increment; returns a forced-download URL (with a real filename and
   * extension) to redirect to, or null if nothing is uploaded yet. Built fresh from
   * filePublicId rather than returning the stored fileUrl directly, so it always forces
   * Content-Disposition: attachment with the book's slug as the filename (see
   * getAttachmentUrl — a bare secure_url for a "raw" resource downloads with no
   * extension and doesn't open).
   */
  async registerBookDownload(id: string): Promise<string | null> {
    const book = await prisma.spiritualBook.findFirst({ where: { id, status: "PUBLISHED" } });
    if (!book || !book.fileUrl || !book.filePublicId) return null;

    prisma.spiritualBook
      .update({ where: { id }, data: { downloadCount: { increment: 1 } } })
      .catch((err) => console.warn("[devotion-library] download count not recorded:", err?.message));

    return getAttachmentUrl(book.filePublicId, "raw", book.slug);
  }

  async listPublicMantras(): Promise<PublicMantraChantDTO[]> {
    const mantras = await prisma.mantraChant.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    });

    return mantras.map((row) => this.toPublicMantraDTO(row));
  }

  async getPublicMantraBySlug(slug: string): Promise<PublicMantraChantDTO> {
    const mantra = await prisma.mantraChant.findFirst({ where: { slug, status: "PUBLISHED" } });
    if (!mantra) throw new ApiError("Mantra not found", STATUS_CODES.NOT_FOUND);
    return this.toPublicMantraDTO(mantra);
  }

  async registerMantraPlay(id: string): Promise<void> {
    const mantra = await prisma.mantraChant.findFirst({ where: { id, status: "PUBLISHED" }, select: { id: true } });
    if (!mantra) throw new ApiError("Mantra not found", STATUS_CODES.NOT_FOUND);

    prisma.mantraChant
      .update({ where: { id }, data: { playCount: { increment: 1 } } })
      .catch((err) => console.warn("[devotion-library] play count not recorded:", err?.message));
  }

  /**
   * Built fresh from audioPublicId rather than the stored audioUrl, so the response always
   * forces Content-Disposition: attachment with the mantra's slug as the filename — a bare
   * secure_url for a "video" (audio) resource has no Content-Disposition at all, so the
   * browser just streams/plays it inline instead of saving a file.
   */
  async registerMantraDownload(id: string): Promise<string | null> {
    const mantra = await prisma.mantraChant.findFirst({ where: { id, status: "PUBLISHED" } });
    if (!mantra || !mantra.audioUrl || !mantra.audioPublicId) return null;

    prisma.mantraChant
      .update({ where: { id }, data: { downloadCount: { increment: 1 } } })
      .catch((err) => console.warn("[devotion-library] download count not recorded:", err?.message));

    return getAttachmentUrl(mantra.audioPublicId, "video", mantra.slug);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async assertBookSlugAvailable(slug: string): Promise<void> {
    const clash = await prisma.spiritualBook.findUnique({ where: { slug } });
    if (clash) throw new ApiError(`The slug "${slug}" is already used by another book`, STATUS_CODES.CONFLICT);
  }

  private async assertMantraSlugAvailable(slug: string): Promise<void> {
    const clash = await prisma.mantraChant.findUnique({ where: { slug } });
    if (clash) throw new ApiError(`The slug "${slug}" is already used by another mantra`, STATUS_CODES.CONFLICT);
  }

  private toBookDTO(row: any): SpiritualBookDTO {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      author: row.author,
      category: row.category,
      description: row.description,
      coverImageUrl: row.coverImageUrl,
      fileUrl: row.fileUrl,
      fileBytes: row.fileBytes,
      status: row.status,
      displayOrder: row.displayOrder,
      downloadCount: row.downloadCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toMantraDTO(row: any): MantraChantDTO {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      deity: row.deity,
      category: row.category,
      lyricsText: row.lyricsText,
      meaning: row.meaning,
      audioUrl: row.audioUrl,
      durationSeconds: row.durationSeconds,
      coverImageUrl: row.coverImageUrl,
      status: row.status,
      displayOrder: row.displayOrder,
      playCount: row.playCount,
      downloadCount: row.downloadCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toPublicBookDTO(row: any): PublicSpiritualBookDTO {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      author: row.author,
      category: row.category,
      description: row.description,
      coverImageUrl: row.coverImageUrl,
      hasFile: Boolean(row.fileUrl),
    };
  }

  private toPublicMantraDTO(row: any): PublicMantraChantDTO {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      deity: row.deity,
      category: row.category,
      lyricsText: row.lyricsText,
      meaning: row.meaning,
      audioUrl: row.audioUrl,
      durationSeconds: row.durationSeconds,
      coverImageUrl: row.coverImageUrl,
    };
  }
}

export default DevotionLibraryService;
