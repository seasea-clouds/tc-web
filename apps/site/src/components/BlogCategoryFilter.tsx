export default function BlogCategoryFilter({
  categories,
  currentCategory,
  onCategoryChange,
  allText,
}: {
  categories: string[];
  currentCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  allText?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onCategoryChange(null)}
        className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
          !currentCategory
            ? 'bg-[#B8960C] text-white'
            : 'bg-[#F4F6F9] text-[#333333] hover:bg-primary-navy/10'
        }`}
      >
        {allText || 'All'}
      </button>
      {categories.map((cat) => (
        <button
          type="button"
          key={cat}
          onClick={() => onCategoryChange(cat)}
          className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
            currentCategory === cat
              ? 'bg-[#B8960C] text-white'
              : 'bg-[#F4F6F9] text-[#333333] hover:bg-primary-navy/10'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
