/**
 * Blog admin procedures - unit tests
 * Tests: DB helpers for blog CRUD
 */
import { describe, it, expect } from "vitest";
import { getBlogPosts, getBlogPostBySlug, getAllBlogPostsAdmin } from "./db";

describe("Blog DB helpers", () => {
  it("getBlogPosts returns an array", async () => {
    const posts = await getBlogPosts(10);
    expect(Array.isArray(posts)).toBe(true);
  });

  it("getBlogPostBySlug returns null for non-existent slug", async () => {
    const post = await getBlogPostBySlug("this-slug-does-not-exist-xyz-abc-123");
    expect(post).toBeNull();
  });

  it("getAllBlogPostsAdmin returns an array", async () => {
    const posts = await getAllBlogPostsAdmin();
    expect(Array.isArray(posts)).toBe(true);
  });
});
