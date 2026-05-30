import { useMemo } from "react";
import DOMPurify from "dompurify";
import "react-quill/dist/quill.snow.css";
import "react-quill/dist/quill.core.css";
import "react-quill/dist/quill.bubble.css";
import { Box, styled } from "@mui/material";
import { convertQortalLinks } from "../../../utils/qortalLink";

const allowedHtmlTags = [
  "a",
  "b",
  "i",
  "em",
  "strong",
  "p",
  "br",
  "div",
  "span",
  "img",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "code",
  "pre",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "s",
  "hr",
];

const allowedHtmlAttrs = [
  "href",
  "target",
  "rel",
  "class",
  "src",
  "alt",
  "title",
  "width",
  "height",
  "align",
  "valign",
  "colspan",
  "rowspan",
  "border",
  "cellpadding",
  "cellspacing",
  "data-url",
];

const CrowdfundInlineContent = styled(Box)(({ theme }) => ({
    display: "flex",
    fontFamily: "Mulish",
    fontSize: "19px",
    fontWeight: 400,
    letterSpacing: 0,
    color: theme.palette.text.primary,
    width: '100%'
  }));

export const DisplayHtml = ({ html, textColor }: any) => {
  const cleanContent = useMemo(() => {
    if (!html) return null;

    const sanitize: string = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: allowedHtmlTags,
      ALLOWED_ATTR: allowedHtmlAttrs,
    });
    const anchorQortal = convertQortalLinks(sanitize);
    return DOMPurify.sanitize(anchorQortal, {
      ALLOWED_TAGS: allowedHtmlTags,
      ALLOWED_ATTR: allowedHtmlAttrs,
    });
  }, [html]);

  if (!cleanContent) return null;
  return (
    <CrowdfundInlineContent>
      <div
        className="ql-editor-display"
        style={{
          color: textColor || 'white',
          fontWeight: 400,
          fontSize: '16px'
        }}
        dangerouslySetInnerHTML={{ __html: cleanContent }}
      />
    </CrowdfundInlineContent>
  );
};
