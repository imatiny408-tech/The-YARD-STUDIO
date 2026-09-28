import { useNav } from "./router";

export const usePathname = () => useNav().path;
export const useSearchParams = () => useNav().query;
export const useRouter = () => {
  const { go } = useNav();
  return { push: go, replace: (h: string) => go(h), back: () => history.back() };
};
export const useParams = () => ({});
