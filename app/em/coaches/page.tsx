import { getCoachLoginProfiles } from "@/lib/data";
import { updateCoachLoginProfileAction } from "@/app/actions/coach-login";
import { CoachProfileTable } from "@/components/CoachProfileTable";

export default async function EMCoachesPage() {
  const profiles = await getCoachLoginProfiles();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          실습코치 프로필
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          &quot;실습코치 로그인&quot; 시트 기준입니다. 내부 소속은 노란색, Inactive는 회색으로 표시됩니다. 수정 버튼으로 프로필을 편집할 수 있습니다.
        </p>
      </div>

      <CoachProfileTable
        profiles={profiles}
        onUpdateProfile={updateCoachLoginProfileAction}
      />
    </div>
  );
}
