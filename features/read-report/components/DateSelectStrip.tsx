import Link from "next/link";

function formatDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const week = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  const today = new Date();
  const isToday =
    today.getFullYear() === y &&
    today.getMonth() === m - 1 &&
    today.getDate() === d;
  if (isToday) return `오늘 (${week})`;
  return `${m}/${d} (${week})`;
}

type Props = {
  selectedDate: string;
  dateKeys: string[];
};

export default function DateSelectStrip({ selectedDate, dateKeys }: Props) {
  return (
    <div className="space-y-3">
      {/* 날짜 선택 스트립 */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-gray-500 mb-3">날짜 선택</p>
        <div className="flex flex-wrap gap-2">
          {dateKeys.map((dateKey) => {
            const isSelected = dateKey === selectedDate;
            return (
              <Link
                key={dateKey}
                href={`/read-report?date=${dateKey}`}
                className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {formatDateLabel(dateKey)}
              </Link>
            );
          })}
        </div>
      </div>

      {/* 선택된 날짜 표시 */}
      <p className="text-gray-600">
        <span className="font-semibold text-gray-900">
          {formatDateLabel(selectedDate)}
        </span>
        <span className="ml-2 text-gray-500">{selectedDate}</span>
      </p>
    </div>
  );
}
