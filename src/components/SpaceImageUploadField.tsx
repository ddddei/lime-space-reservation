type SpaceImageUploadFieldProps = {
  readonly selectedFile: File | undefined;
  readonly previewUrl: string | undefined;
  readonly onFileSelected: (file: File) => void;
  readonly onClearFile: () => void;
  readonly helperText?: string;
};

/**
 * 사진 파일 선택 + 미리보기 + 선택 취소 UI.
 * 실제 업로드(uploadSpaceImage 호출)는 저장 버튼을 누르는 시점에 호출부에서 수행한다.
 * SpaceCreateForm(신규 공간)과 SpaceAdminEditor(기존 공간 수정)가 함께 사용한다.
 */
export function SpaceImageUploadField(props: SpaceImageUploadFieldProps) {
  return (
    <div className="grid gap-1 text-sm font-bold text-[#172014]">
      사진 파일 업로드
      <input
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file === undefined) {
            return;
          }
          props.onFileSelected(file);
          event.target.value = "";
        }}
        className="rounded-lg border border-[#DDE8D6] px-3 py-2 font-medium"
      />
      {props.selectedFile !== undefined && (
        <div className="mt-1 flex items-center gap-2 text-xs font-medium text-[#4B5945]">
          {props.previewUrl !== undefined && (
            <img src={props.previewUrl} alt="선택한 사진 미리보기" className="h-10 w-10 rounded object-cover" />
          )}
          <span className="truncate">{props.selectedFile.name}</span>
          <button
            type="button"
            onClick={props.onClearFile}
            className="shrink-0 rounded border border-[#DDE8D6] px-2 py-1 font-bold text-[#172014]"
          >
            선택 취소
          </button>
        </div>
      )}
      <span className="text-xs font-medium text-[#4B5945]">
        {props.helperText ?? "파일을 선택하면 사진 URL 입력값 대신 업로드된 파일이 사용됩니다."}
      </span>
    </div>
  );
}
