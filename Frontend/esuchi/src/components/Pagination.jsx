import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "../css/Pagination.css";

const getVisiblePages = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage]);

  if (currentPage > 1) {
    pages.add(currentPage - 1);
  }

  if (currentPage < totalPages) {
    pages.add(currentPage + 1);
  }

  return Array.from(pages)
    .sort((a, b) => a - b)
    .reduce((items, page, index, sortedPages) => {
      if (index > 0 && page - sortedPages[index - 1] > 1) {
        items.push(`gap-${page}`);
      }

      items.push(page);
      return items;
    }, []);
};

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel = "items",
}) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const visiblePages = useMemo(
    () => getVisiblePages(currentPage, totalPages),
    [currentPage, totalPages],
  );

  if (totalPages <= 1) {
    return null;
  }

  const firstItem = (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);

  const changePage = (page) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);

    if (nextPage !== currentPage) {
      onPageChange(nextPage);
    }
  };

  return (
    <nav className="pagination" aria-label={`${itemLabel} pagination`}>
      <p className="pagination-summary">
        Showing {firstItem}-{lastItem} of {totalItems} {itemLabel}
      </p>

      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-button pagination-arrow"
          onClick={() => changePage(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {visiblePages.map((page) =>
          typeof page === "number" ? (
            <button
              key={page}
              type="button"
              className={`pagination-button ${page === currentPage ? "active" : ""}`}
              onClick={() => changePage(page)}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          ) : (
            <span key={page} className="pagination-gap" aria-hidden="true">
              ...
            </span>
          ),
        )}

        <button
          type="button"
          className="pagination-button pagination-arrow"
          onClick={() => changePage(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}
